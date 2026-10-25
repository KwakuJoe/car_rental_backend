import { BaseTransformer } from '@adonisjs/core/transformers'
import type Permission from '#models/permission'

export default class PermissionTransformer extends BaseTransformer<Permission> {
  toObject() {
    return this.pick(this.resource, ['id', 'name', 'slug', 'group', 'description'])
  }
}
