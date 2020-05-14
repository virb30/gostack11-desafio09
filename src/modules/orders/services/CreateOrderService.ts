import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer does not exists');
    }

    const storedProducts = await this.productsRepository.findAllById(
      products.map(product => ({ id: product.id })),
    );

    if (storedProducts.length !== products.length) {
      throw new AppError(
        'One or more products requested does not exists on database',
      );
    }

    const outOfStock = products.filter(product => {
      const storedProduct = storedProducts.find(
        findProduct => findProduct.id === product.id,
      );

      return (
        storedProduct &&
        storedProduct.id === product.id &&
        storedProduct.quantity - product.quantity < 0
      );
    });

    if (outOfStock.length > 0) {
      throw new AppError('Some of ordered products are out of stock');
    }

    const orderedProducts = storedProducts.map(storedProduct => {
      const productIndex = products.findIndex(
        product => product.id === storedProduct.id,
      );

      return {
        product_id: storedProduct.id,
        price: storedProduct.price,
        quantity: products[productIndex].quantity,
      };
    });

    const order = await this.ordersRepository.create({
      customer,
      products: orderedProducts,
    });

    await this.productsRepository.updateQuantity(products);

    return order;
  }
}

export default CreateOrderService;

// registrar compra
// debitar os itens do estoque
