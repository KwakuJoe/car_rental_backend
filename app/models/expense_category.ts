import { ExpenseCategorySchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { withUlid } from '#models/mixins/with_ulid'

/** What an expense was for (fuel, repairs, salaries...) - see the expenses migration for the defaults. */
export default class ExpenseCategory extends compose(ExpenseCategorySchema, withUlid) {}
