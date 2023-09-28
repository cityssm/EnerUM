import sqlite from 'better-sqlite3'

import { databasePath } from '../helpers/functions.database.js'
import type { Asset } from '../types/recordTypes.js'

import { ensureEnergyDataTableExists } from './manageEnergyDataTables.js'

export async function addAsset(
  asset: Partial<Asset>,
  sessionUser: EmileUser,
  connectedEmileDB?: sqlite.Database
): Promise<number> {
  const emileDB =
    connectedEmileDB === undefined ? sqlite(databasePath) : connectedEmileDB

  const rightNowMillis = Date.now()

  const result = emileDB
    .prepare(
      `insert into Assets (
        assetName, categoryId,
        latitude, longitude,
        recordCreate_userName, recordCreate_timeMillis,
        recordUpdate_userName, recordUpdate_timeMillis)
        values (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      asset.assetName,
      asset.categoryId,
      (asset.latitude ?? '') === '' ? undefined : asset.latitude,
      (asset.longitude ?? '') === '' ? undefined : asset.longitude,
      sessionUser.userName,
      rightNowMillis,
      sessionUser.userName,
      rightNowMillis
    )

  const assetId = result.lastInsertRowid as number

  await ensureEnergyDataTableExists(assetId)

  if (connectedEmileDB === undefined) {
    emileDB.close()
  }

  return assetId
}
