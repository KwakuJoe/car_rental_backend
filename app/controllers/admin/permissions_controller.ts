import type { HttpContext } from '@adonisjs/core/http'
import Permission from '#models/permission'
import PermissionTransformer from '#transformers/permission_transformer'
import { permissionFilterValidator } from '#validators/permission'
import PermissionFilter from '#filters/permission_filter'

export default class PermissionsController {
  async index({ request, response, serialize }: HttpContext) {
    const payload = await request.validateUsing(permissionFilterValidator)
    const page = payload.page ?? 1
    const limit = payload.limit ?? 20

    const query = new PermissionFilter(Permission.query(), { ...payload }).apply()
    const permissions = await query.paginate(page, limit)

    const transformed = await serialize(
      PermissionTransformer.paginate(permissions.all(), permissions.getMeta())
    )

    return response.ok({
      message: 'Permissions fetched successfully',
      data: transformed.data,
      meta: transformed.metadata,
    })
  }
}
