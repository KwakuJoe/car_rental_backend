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
import AuditService from '#services/audit_service'

const auditSubject = (role: Role) => ({ type: 'role', id: role.id, label: role.name })

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

  async store(ctx: HttpContext) {
    const { request, response, serialize } = ctx
    const data = await request.validateUsing(createRoleValidator)
    const role = await Role.create(data)
    await AuditService.record(ctx, {
      action: 'role.created',
      subject: auditSubject(role),
      after: AuditService.pick(role, ['name', 'slug', 'description']),
    })
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

  async update(ctx: HttpContext) {
    const { params, request, response, serialize } = ctx
    const data = await request.validateUsing(updateRoleValidator)

    const role = await Role.findOrFail(params.id)
    if (role.isSystem && data.name && data.name !== role.name) {
      return response.badRequest({ message: 'System roles cannot be renamed' })
    }

    const before = AuditService.pick(role, ['name', 'description'])
    role.merge(data)
    await role.save()
    await AuditService.record(ctx, {
      action: 'role.updated',
      subject: auditSubject(role),
      before,
      after: AuditService.pick(role, ['name', 'description']),
    })
    await role.load('permissions')

    const transformed = await serialize(RoleTransformer.transform(role))
    return response.ok({
      message: 'Role updated successfully',
      data: transformed.data,
    })
  }

  async destroy(ctx: HttpContext) {
    const { params, response } = ctx
    const role = await Role.query()
      .where('id', params.id)
      .preload('permissions')
      .withCount('users')
      .firstOrFail()
    if (role.isSystem) {
      return response.badRequest({ message: 'System roles cannot be deleted' })
    }

    await role.delete()
    await AuditService.record(ctx, {
      action: 'role.deleted',
      subject: auditSubject(role),
      before: {
        ...AuditService.pick(role, ['name', 'slug', 'description']),
        permissions: role.permissions.map((permission) => permission.slug).sort(),
      },
      metadata: { staffLeftWithoutRole: Number(role.$extras.users_count ?? 0) },
    })

    return response.ok({
      message: 'Role deleted successfully',
    })
  }

  async syncPermissions(ctx: HttpContext) {
    const { params, request, response, serialize } = ctx
    const { permissionIds } = await request.validateUsing(syncRolePermissionsValidator)

    const role = await Role.query().where('id', params.id).preload('permissions').firstOrFail()
    const slugs = () => role.permissions.map((permission) => permission.slug).sort()
    const before = { permissions: slugs() }
    await role.related('permissions').sync(permissionIds)
    await role.load('permissions')
    await AuditService.record(ctx, {
      action: 'role.permissions_synced',
      subject: auditSubject(role),
      before,
      after: { permissions: slugs() },
    })

    const transformed = await serialize(RoleTransformer.transform(role))
    return response.ok({
      message: 'Role permissions updated successfully',
      data: transformed.data,
    })
  }
}
