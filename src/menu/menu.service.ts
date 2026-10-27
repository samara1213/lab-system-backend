import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { Menu } from './entities/menu.entity';
import { ExceptionService } from '../exceptions/exception/exception.service';

// profundidad maxima del arbol de menus (lo que pinta la barra lateral)
const MAX_LEVEL = 3;

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(Menu)
    private readonly menuRepository: Repository<Menu>,
    private readonly dataSource: DataSource,
    private readonly exceptionService: ExceptionService,
  ) {}

  /**
   * Crea una opcion de menu al final de sus hermanas. El nivel se calcula del padre
   * @param createMenuDto datos de la opcion
   * @returns respuesta del proceso
   */
  async create(createMenuDto: CreateMenuDto) {
    try {
      const { men_parent, module, ...menuData } = this.normalize(createMenuDto);
      const parent = men_parent ? await this.findById(men_parent) : null;
      const level = parent ? (parent.men_level ?? 1) + 1 : 1;
      if (level > MAX_LEVEL)
        throw new BadRequestException(
          `El menú admite máximo ${MAX_LEVEL} niveles`,
        );

      this.assertModule(menuData.men_url, module);

      const men_order =
        menuData.men_order ?? (await this.nextOrder(parent?.men_id ?? null));
      await this.menuRepository.save(
        this.menuRepository.create({
          ...menuData,
          men_order,
          men_level: level,
          men_parent: parent ? { men_id: parent.men_id } : null,
          module: module ? { mod_slug: module } : null,
        }),
      );

      return {
        status: 201,
        message: 'La opción de menú se ha creado correctamente',
      };
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }

  /**
   * Todas las opciones de menu (lista plana con padre y modulo), en orden
   * @returns listado de opciones
   */
  async findAll() {
    try {
      const menus = await this.menuRepository.find({
        relations: { men_parent: true, module: true },
        order: { men_level: 'ASC', men_order: 'ASC', men_name: 'ASC' },
      });

      return {
        status: 200,
        data: menus.map((menu) => ({
          men_id: menu.men_id,
          men_name: menu.men_name,
          men_url: menu.men_url,
          men_icon: menu.men_icon,
          men_level: menu.men_level,
          men_order: menu.men_order,
          men_active: menu.men_active,
          men_parent: menu.men_parent?.men_id ?? null,
          module: menu.module?.mod_slug ?? null,
        })),
      };
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }

  /**
   * Actualiza una opcion de menu. Al cambiar de padre se valida que no quede
   * dentro de si misma y que el arbol no pase de 3 niveles; los niveles de sus
   * hijas se recalculan
   * @param id id de la opcion
   * @param updateMenuDto datos a actualizar
   * @returns respuesta del proceso
   */
  async update(id: string, updateMenuDto: UpdateMenuDto) {
    try {
      const menu = await this.findById(id);
      const { men_parent, module, ...menuData } = this.normalize(updateMenuDto);
      const all = await this.menuRepository.find({
        relations: { men_parent: true },
      });

      // padre nuevo (null = primer nivel; undefined = sin cambio)
      const parentChanged =
        men_parent !== undefined &&
        men_parent !== (menu.men_parent?.men_id ?? null);
      let level = menu.men_level ?? 1;
      if (parentChanged) {
        if (men_parent) {
          if (
            men_parent === id ||
            this.descendantsOf(id, all).has(men_parent)
          ) {
            throw new BadRequestException(
              'Una opción no puede quedar dentro de sí misma',
            );
          }
          level = ((await this.findById(men_parent)).men_level ?? 1) + 1;
        } else {
          level = 1;
        }
        if (level + this.depthBelow(id, all) > MAX_LEVEL)
          throw new BadRequestException(
            `El menú admite máximo ${MAX_LEVEL} niveles`,
          );
      }

      const url =
        menuData.men_url !== undefined ? menuData.men_url : menu.men_url;
      const moduleSlug =
        module !== undefined ? module : (menu.module?.mod_slug ?? null);
      this.assertModule(url, moduleSlug);

      await this.dataSource.transaction(async (manager) => {
        const repo = manager.getRepository(Menu);
        await repo.update(
          { men_id: id },
          {
            ...menuData,
            ...(module !== undefined || !url
              ? { module: moduleSlug && url ? { mod_slug: moduleSlug } : null }
              : {}),
            ...(parentChanged
              ? {
                  men_parent: men_parent ? { men_id: men_parent } : null,
                  men_level: level,
                  men_order:
                    menuData.men_order ??
                    (await this.nextOrder(men_parent ?? null)),
                }
              : {}),
          },
        );
        if (parentChanged) await this.relevelChildren(repo, id, level, all);
      });

      return {
        status: 200,
        message: 'La opción de menú se ha actualizado correctamente',
      };
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }

  /**
   * Intercambia el orden de una opcion con su hermana anterior o siguiente
   * @param id id de la opcion
   * @param direction 'up' o 'down'
   */
  async move(id: string, direction: 'up' | 'down') {
    try {
      const menu = await this.findById(id);
      const parentId = menu.men_parent?.men_id ?? null;
      const siblings = await this.menuRepository.find({
        where: parentId
          ? { men_parent: { men_id: parentId } }
          : { men_level: menu.men_level ?? 1 },
        relations: { men_parent: true },
        order: { men_order: 'ASC', men_name: 'ASC' },
      });
      const list = siblings.filter(
        (s) => (s.men_parent?.men_id ?? null) === parentId,
      );

      const index = list.findIndex((s) => s.men_id === id);
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= list.length)
        return { status: 200, message: 'La opción ya está en el extremo' };

      // se renumeran las hermanas para que el orden quede consecutivo
      [list[index], list[target]] = [list[target], list[index]];
      await this.dataSource.transaction(async (manager) => {
        for (const [position, sibling] of list.entries()) {
          await manager
            .getRepository(Menu)
            .update({ men_id: sibling.men_id }, { men_order: position + 1 });
        }
      });

      return {
        status: 200,
        message: 'Orden actualizado',
      };
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }

  /**
   * Elimina una opcion sin hijas (para quitarla sin borrar, desactivarla)
   * @param id id de la opcion
   */
  async remove(id: string) {
    try {
      await this.findById(id);
      if (
        await this.menuRepository.exists({
          where: { men_parent: { men_id: id } },
        })
      ) {
        throw new ConflictException(
          'La opción tiene opciones dentro: muévelas o elimínalas primero',
        );
      }

      await this.menuRepository.delete({ men_id: id });

      return {
        status: 200,
        message: 'La opción de menú se ha eliminado correctamente',
      };
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }

  /**
   * Limpia los valores recibidos: url con "/" inicial y vacios como null
   */
  private normalize<T extends CreateMenuDto | UpdateMenuDto>(dto: T): T {
    const data = { ...dto };
    for (const key of ['men_url', 'men_icon', 'module'] as const) {
      if (typeof data[key] === 'string' && data[key].trim() === '')
        data[key] = null;
    }
    if (typeof data.men_url === 'string')
      data.men_url =
        '/' +
        data.men_url
          .trim()
          .replace(/^\/+|\/+$/g, '')
          .toLowerCase();
    if (typeof data.men_name === 'string') data.men_name = data.men_name.trim();
    return data;
  }

  /**
   * Una opcion con url necesita el modulo que da acceso a ella
   */
  private assertModule(
    url: string | null | undefined,
    module: string | null | undefined,
  ) {
    if (url && !module)
      throw new BadRequestException(
        'Indica el módulo que da acceso a esta opción',
      );
  }

  private async findById(id: string) {
    const menu = await this.menuRepository.findOne({
      where: { men_id: id },
      relations: { men_parent: true, module: true },
    });
    if (!menu) throw new NotFoundException('La opción de menú no existe');
    return menu;
  }

  private async nextOrder(parentId: string | null) {
    const query = this.menuRepository
      .createQueryBuilder('menu')
      .select('COALESCE(MAX(menu.men_order), 0)', 'max');
    if (parentId) query.where('menu.men_parent = :parentId', { parentId });
    else query.where('menu.men_parent IS NULL');
    const { max } = await query.getRawOne();
    return Number(max) + 1;
  }

  /**
   * Ids de todas las opciones dentro de una opcion
   */
  private descendantsOf(id: string, all: Menu[]) {
    const result = new Set<string>();
    const stack = [id];
    while (stack.length) {
      const current = stack.pop();
      for (const menu of all) {
        if (menu.men_parent?.men_id === current && !result.has(menu.men_id)) {
          result.add(menu.men_id);
          stack.push(menu.men_id);
        }
      }
    }
    return result;
  }

  /**
   * Niveles que hay por debajo de una opcion (0 si no tiene hijas)
   */
  private depthBelow(id: string, all: Menu[]): number {
    const children = all.filter((menu) => menu.men_parent?.men_id === id);
    return children.length === 0
      ? 0
      : 1 +
          Math.max(
            ...children.map((child) => this.depthBelow(child.men_id, all)),
          );
  }

  /**
   * Recalcula el nivel de las hijas despues de mover una opcion
   */
  private async relevelChildren(
    repo: Repository<Menu>,
    id: string,
    level: number,
    all: Menu[],
  ) {
    for (const child of all.filter((menu) => menu.men_parent?.men_id === id)) {
      await repo.update({ men_id: child.men_id }, { men_level: level + 1 });
      await this.relevelChildren(repo, child.men_id, level + 1, all);
    }
  }
}
