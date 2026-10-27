/*
|--------------------------------------------------------------------------
| Scheduler
|--------------------------------------------------------------------------
|
| The recurring jobs. Registered (upserted by id) when the web server
| starts; stored in the database and run by the worker
| (`node ace queue:work`) - so they run once, however many web servers.
|
*/
import logger from '@adonisjs/core/services/logger'
import CheckDocumentExpiriesJob from '#jobs/check_document_expiries_job'
import CheckOverdueReturnsJob from '#jobs/check_overdue_returns_job'
import CleanupFilesJob from '#jobs/cleanup_files_job'
import ExpireHoldsJob from '#jobs/expire_holds_job'

try {
  await ExpireHoldsJob.schedule({}).id('expire-holds').every('5m').run()
  await CheckOverdueReturnsJob.schedule({}).id('check-overdue-returns').every('15m').run()
  await CheckDocumentExpiriesJob.schedule({})
    .id('check-document-expiries')
    .cron('0 6 * * *')
    .timezone('Africa/Accra')
    .run()
  await CleanupFilesJob.schedule({})
    .id('cleanup-files')
    .cron('0 2 * * *')
    .timezone('Africa/Accra')
    .run()
} catch (error) {
  // e.g. the queue tables aren't migrated yet - the site still starts
  logger.error({ err: (error as Error).message }, 'Could not register the scheduled jobs')
}
