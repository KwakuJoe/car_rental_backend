/** Checked at every check-out and check-in; editable in Settings. */
export const defaultChecklist = [
  'Spare tyre',
  'Jack and wheel spanner',
  'Warning triangles',
  'Fire extinguisher',
  'First aid kit',
  'Car documents (registration, insurance, roadworthy)',
  'Keys (number handed over)',
  'Floor mats',
  'Radio / screen',
  'Phone charger',
]

/**
 * Version 1 of the rental terms - a DRAFT for the owner (or their lawyer) to
 * replace before go-live (Settings → Rental terms). Every signature records
 * the version it was given against.
 */
export const draftTerms = `DRAFT - replace with your own terms before going live.

1. The renter must hold a valid driving licence for the whole rental and be at least the minimum age stated at booking. Only drivers named on the agreement may drive.
2. The car must be returned at the agreed date, time and place. Late returns are charged as shown on the agreement.
3. The car is handed over with the fuel level recorded at check-out and must be returned with the same level. Missing fuel is charged.
4. Mileage is as stated on the agreement. Kilometres over the allowance are charged per km.
5. The renter is responsible for damage during the rental up to the excess of the chosen protection plan, and in full for damage caused by negligence, driving under the influence, or use against these terms.
6. Traffic and parking fines during the rental are the renter's responsibility, plus an administration fee.
7. The car may not be used for hire, racing, towing, off-road driving, or taken outside Ghana without written permission.
8. Smoking in the car is not allowed; cleaning after smoking is charged.
9. The security deposit is refunded after return, less any charges under these terms.
10. Personal data is handled under the Data Protection Act, 2012 (Act 843).`
