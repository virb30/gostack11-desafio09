import { getRepository, Repository, In, PromiseUtils } from 'typeorm';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICreateProductDTO from '@modules/products/dtos/ICreateProductDTO';
import IUpdateProductsQuantityDTO from '@modules/products/dtos/IUpdateProductsQuantityDTO';
import Product from '../entities/Product';

interface IFindProducts {
  id: string;
}

class ProductsRepository implements IProductsRepository {
  private ormRepository: Repository<Product>;

  constructor() {
    this.ormRepository = getRepository(Product);
  }

  public async create({
    name,
    price,
    quantity,
  }: ICreateProductDTO): Promise<Product> {
    const product = this.ormRepository.create({ name, price, quantity });

    await this.ormRepository.save(product);

    return product;
  }

  public async findByName(name: string): Promise<Product | undefined> {
    const product = await this.ormRepository.findOne({
      where: {
        name,
      },
    });

    return product;
  }

  public async findAllById(products: IFindProducts[]): Promise<Product[]> {
    const findProducts = await this.ormRepository.find({
      where: {
        id: In(products.map(product => product.id)),
      },
    });

    return findProducts;
  }

  public async updateQuantity(
    products: IUpdateProductsQuantityDTO[],
  ): Promise<Product[]> {
    const findProducts = await this.ormRepository.find({
      where: {
        id: In(products.map(product => product.id)),
      },
    });

    const productsForUpdate = await PromiseUtils.runInSequence(
      findProducts,
      async product => {
        const productIndex = products.findIndex(
          findProduct => findProduct.id === product.id,
        );

        Object.assign(product, {
          quantity: product.quantity - products[productIndex].quantity,
        });

        return product;
      },
    );

    const updatedProducts = await this.ormRepository.save(productsForUpdate);

    return updatedProducts;
  }
}

export default ProductsRepository;
