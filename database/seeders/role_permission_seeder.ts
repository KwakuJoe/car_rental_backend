import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Role from '#models/role'
import Permission from '#models/permission'
import {
  roleData,
  permissionData,
  rolePermissionMap,
} from '#database/seed_data/role_permission_data'

export default class extends BaseSeeder {
  async run() {
    const options = { client: this.client }

    const permissionsBySlug = new Map<string, Permission>()
    for (const permission of permissionData) {
      const record = await Permission.firstOrCreate({ slug: permission.slug }, permission, options)
      permissionsBySlug.set(permission.slug, record)
    }

    for (const role of roleData) {
      const record = await Role.firstOrCreate({ slug: role.slug }, role, options)

      const permissionIds = (rolePermissionMap[role.slug] ?? [])
        .map((slug) => permissionsBySlug.get(slug)?.id)
        .filter((id): id is string => id !== undefined)

      if (permissionIds.length > 0) {
        // `false` means additive - existing attachments not in this list
        // are left alone, so re-running the seeder never undoes manual
        // permission changes made later through the admin API.
        await record.related('permissions').sync(permissionIds, false)
      }
    }
  }
}
