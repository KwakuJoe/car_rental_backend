import type { HttpContext } from '@adonisjs/core/http'
import Role from '#models/role'
import RoleTransformer from '#transformers/role_transformer'
import {
  createRoleValidator,
  updateRoleValidator,
  syncRolePermissionsValidator,
  roleFilterValidator,
} from '#validators/role'
import RoleFilter from '#filters/role_filter'

export default class RolesController {
  async index({ request, response, serialize }: HttpContext) {
    const payload = await request.validateUsing(roleFilterValidator)
    const page = payload.page ?? 1
    const limit = payload.limit ?? 20

    const query = new RoleFilter(Role.query().preload('permissions').withCount('users'), {
      ...payload,
    }).apply()
    const roles = await query.paginate(page, limit)

    const transformed = await serialize(RoleTransformer.paginate(roles.all(), roles.getMeta()))

    return response.ok({
      message: 'Roles fetched successfully',
      data: transformed.data,
      meta: transformed.metadata,
    })
  }

  async store({ request, response, serialize }: HttpContext) {
    const data = await request.validateUsing(createRoleValidator)
    const role = await Role.create(data)
    await role.load('permissions')

    const transformed = await serialize(RoleTransformer.transform(role))
    return response.created({
      message: 'Role created successfully',
      data: transformed.data,
    })
  }

  async show({ params, response, serialize }: HttpContext) {
    const role = await Role.query()
      .where('id', params.id)
      .preload('permissions')
      .withCount('users')
      .firstOrFail()
    const transformed = await serialize(RoleTransformer.transform(role))

    return response.ok({
      message: 'Role fetched successfully',
      data: transformed.data,
    })
  }

  async update({ params, request, response, serialize }: HttpContext) {
    const data = await request.validateUsing(updateRoleValidator)

    const role = await Role.findOrFail(params.id)
    if (role.isSystem && data.name && data.name !== role.name) {
      return response.badRequest({ message: 'System roles cannot be renamed' })
    }

    role.merge(data)
    await role.save()
    await role.load('permissions')

    const transformed = await serialize(RoleTransformer.transform(role))
    return response.ok({
      message: 'Role updated successfully',
      data: transformed.data,
    })
  }

  async destroy({ params, response }: HttpContext) {
    const role = await Role.findOrFail(params.id)
    if (role.isSystem) {
      return response.badRequest({ message: 'System roles cannot be deleted' })
    }

    await role.delete()

    return response.ok({
      message: 'Role deleted successfully',
    })
  }

  async syncPermissions({ params, request, response, serialize }: HttpContext) {
    const { permissionIds } = await request.validateUsing(syncRolePermissionsValidator)

    const role = await Role.findOrFail(params.id)
    await role.related('permissions').sync(permissionIds)
    await role.load('permissions')

    const transformed = await serialize(RoleTransformer.transform(role))
    return response.ok({
      message: 'Role permissions updated successfully',
      data: transformed.data,
    })
  }
}
