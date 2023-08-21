// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/indent */

import { dateStringToDate } from '@cityssm/utils-datetime'
import sqlite from 'better-sqlite3'

import { databasePath } from '../helpers/functions.database.js'
import type { EnergyData } from '../types/recordTypes.js'

interface GetEnergyDataFilters {
  assetId?: number | string
  groupId?: number | string
  dataTypeId?: number | string
  fileId?: number | string
  startDateString?: string
  endDateString?: string
  timeSecondsMin?: number | string
  timeSecondsMax?: number | string
}

interface GetEnergyDataOptions {
  formatForExport?: boolean
}

export function getEnergyData(
  filters: GetEnergyDataFilters,
  options?: GetEnergyDataOptions
): EnergyData[] {
  const columnNames =
    options?.formatForExport ?? false
      ? `d.dataId,
        c.category, a.assetName, 
        ts.serviceCategory,
        tu.unit,
        tr.readingType,
        tc.commodity,
        ta.accumulationBehaviour,
        datetime(d.timeSeconds, 'unixepoch', 'localtime') as startDateTime,
        d.durationSeconds,
        d.dataValue, d.powerOfTenMultiplier`
      : `d.dataId,
        d.assetId, a.assetName, c.category, c.fontAwesomeIconClasses,
        d.dataTypeId,
        t.serviceCategoryId, ts.serviceCategory,
        t.unitId, tu.unit, tu.unitLong,
        t.readingTypeId, tr.readingType,
        t.commodityId, tc.commodity,
        t.accumulationBehaviourId, ta.accumulationBehaviour,
        d.fileId, f.originalFileName,
        d.timeSeconds, d.durationSeconds, d.endTimeSeconds,
        d.dataValue, d.powerOfTenMultiplier`

  let sql = `select ${columnNames}
    from EnergyData d
    left join Assets a
      on d.assetId = a.assetId
    left join AssetCategories c
      on a.categoryId = c.categoryId
    left join EnergyDataTypes t
      on d.dataTypeId = t.dataTypeId
    left join EnergyServiceCategories ts
      on t.serviceCategoryId = ts.serviceCategoryId
    left join EnergyUnits tu
      on t.unitId = tu.unitId
    left join EnergyReadingTypes tr
      on t.readingTypeId = tr.readingTypeId
    left join EnergyCommodities tc
      on t.commodityId = tc.commodityId
    left join EnergyAccumulationBehaviours ta
      on t.accumulationBehaviourId = ta.accumulationBehaviourId
    left join EnergyDataFiles f
      on d.fileId = f.fileId
    where d.recordDelete_timeMillis is null
      and a.recordDelete_timeMillis is null`

  const sqlParameters: unknown[] = []

  if ((filters.assetId ?? '') !== '') {
    sql += ' and d.assetId = ?'
    sqlParameters.push(filters.assetId)
  }

  if ((filters.groupId ?? '') !== '') {
    sql +=
      ' and d.assetId in (select assetId from AssetGroupMembers where recordDelete_timeMillis is null and groupId = ?)'
    sqlParameters.push(filters.groupId)
  }

  if ((filters.dataTypeId ?? '') !== '') {
    sql += ' and d.dataTypeId = ?'
    sqlParameters.push(filters.dataTypeId)
  }

  if ((filters.fileId ?? '') !== '') {
    sql += ' and d.fileId = ?'
    sqlParameters.push(filters.fileId)
  }

  if ((filters.startDateString ?? '') !== '') {
    sql += ' and d.timeSeconds >= ?'

    sqlParameters.push(
      dateStringToDate(filters.startDateString ?? '').getTime() / 1000
    )
  }

  if ((filters.timeSecondsMin ?? '') !== '') {
    sql += ' and d.timeSeconds >= ?'

    sqlParameters.push(filters.timeSecondsMin)
  }

  if ((filters.endDateString ?? '') !== '') {
    sql += ' and d.timeSeconds <= ?'

    const endDate = dateStringToDate(filters.endDateString ?? '')
    endDate.setDate(endDate.getDate() + 1)

    sqlParameters.push(endDate.getTime() / 1000)
  }

  if ((filters.timeSecondsMax ?? '') !== '') {
    sql += ' and d.timeSeconds <= ?'

    sqlParameters.push(filters.timeSecondsMax)
  }

  sql += ' order by d.assetId, d.dataTypeId, d.timeSeconds'

  const emileDB = sqlite(databasePath, {
    readonly: true
  })

  const data = emileDB.prepare(sql).all(sqlParameters) as EnergyData[]

  emileDB.close()

  return data
}
