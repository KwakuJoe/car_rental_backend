import type { HttpContext } from '@adonisjs/core/http'
import TodayService from '#services/bookings/today_service'

export default class TodayController {
  /** The Today board (M3.10) - see TodayService. */
  async show({ response }: HttpContext) {
    return response.ok({ message: 'Today', data: await TodayService.board() })
  }
}
