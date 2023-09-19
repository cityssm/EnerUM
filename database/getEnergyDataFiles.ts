// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/indent */

import { getConnectionWhenAvailable } from '../helpers/functions.database.js'
import type { EnergyDataFile } from '../types/recordTypes.js'

interface GetEnergyDataFilesFilters {
  isPending?: boolean
  isProcessed?: boolean
  isFailed?: boolean
  searchString?: string
  systemFolderPath?: string
}

interface GetEnergyDataFilesOptions {
  limit: number | -1
  includeSystemFileAndFolder: boolean
  includeAssetDetails: boolean
  includeDeletedRecords?: boolean
}

function buildWhereClause(filters: GetEnergyDataFilesFilters): {
  sqlWhereClause: string
  sqlParameters: unknown[]
} {
  let sqlWhereClause = ''
  const sqlParameters: unknown[] = []

  if ((filters.isPending ?? '') !== '') {
    sqlWhereClause += ' and f.isPending = ?'

    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    sqlParameters.push(filters.isPending ? 1 : 0)
  }

  if ((filters.isProcessed ?? '') !== '') {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    sqlWhereClause += filters.isProcessed
      ? ' and f.processedTimeMillis is not null'
      : ' and f.processedTimeMillis is null'
  }

  if ((filters.isFailed ?? '') !== '') {
    sqlWhereClause += ' and f.isFailed = ?'

    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    sqlParameters.push(filters.isFailed ? 1 : 0)
  }

  if ((filters.searchString ?? '') !== '') {
    sqlWhereClause += ' and (instr(f.originalFileName, ?) > 0)'
    sqlParameters.push(filters.searchString)
  }

  if ((filters.systemFolderPath ?? '') !== '') {
    sqlWhereClause += ' and f.systemFolderPath = ?'
    sqlParameters.push(filters.systemFolderPath)
  }

  return {
    sqlWhereClause,
    sqlParameters
  }
}

export async function getEnergyDataFiles(
  filters: GetEnergyDataFilesFilters,
  options: GetEnergyDataFilesOptions
): Promise<EnergyDataFile[]> {
  const groupByColumnNames = `f.fileId, f.originalFileName,
    ${
      options.includeSystemFileAndFolder
        ? ' f.systemFileName, f.systemFolderPath,'
        : ''
    }
    f.assetId,
    ${
      options.includeAssetDetails
        ? ' a.assetName, c.category, c.fontAwesomeIconClasses,'
        : ''
    }
    isPending, parserPropertiesJson,
    processedTimeMillis, isFailed, processedMessage,
    f.recordCreate_timeMillis, f.recordUpdate_timeMillis`

  const { sqlParameters, sqlWhereClause } = buildWhereClause(filters)

  let sql = `select ${groupByColumnNames},
    count(d.dataId) as energyDataCount,
    count(distinct d.assetId) as assetIdCount,
    min(d.timeSeconds) as timeSecondsMin,
    max(d.endTimeSeconds) as endTimeSecondsMax
    from EnergyDataFiles f
    left join Assets a on f.assetId = a.assetId
    left join AssetCategories c on a.categoryId = c.categoryId
    left join EnergyData d on f.fileId = d.fileId and d.recordDelete_timeMillis is null
    where ${
      options.includeDeletedRecords ?? false
        ? ' 1 = 1'
        : 'f.recordDelete_timeMillis is null'
    }
    ${sqlWhereClause}
    group by ${groupByColumnNames}
    order by f.recordUpdate_timeMillis desc`

  if (options.limit !== -1) {
    sql += ` limit ${options.limit}`
  }

  const emileDB = await getConnectionWhenAvailable(true)

  const dataFiles = emileDB.prepare(sql).all(sqlParameters) as EnergyDataFile[]

  emileDB.close()

  for (const dataFile of dataFiles) {
    if (
      dataFile.parserPropertiesJson !== undefined &&
      dataFile.parserPropertiesJson !== null
    ) {
      dataFile.parserProperties = JSON.parse(dataFile.parserPropertiesJson)
    }

    delete dataFile.parserPropertiesJson
  }

  return dataFiles
}

export async function getPendingEnergyDataFiles(): Promise<EnergyDataFile[]> {
  return await getEnergyDataFiles(
    {
      isPending: true
    },
    {
      includeAssetDetails: true,
      includeSystemFileAndFolder: false,
      limit: -1
    }
  )
}

export async function getFailedEnergyDataFiles(): Promise<EnergyDataFile[]> {
  return await getEnergyDataFiles(
    {
      isFailed: true
    },
    {
      includeAssetDetails: true,
      includeSystemFileAndFolder: false,
      limit: -1
    }
  )
}

export async function getProcessedEnergyDataFiles(
  searchString?: ''
): Promise<EnergyDataFile[]> {
  return await getEnergyDataFiles(
    {
      isProcessed: true,
      searchString
    },
    {
      includeAssetDetails: true,
      includeSystemFileAndFolder: false,
      limit: 100
    }
  )
}

export async function getEnergyDataFilesToProcess(): Promise<EnergyDataFile[]> {
  return await getEnergyDataFiles(
    {
      isPending: false,
      isProcessed: false
    },
    {
      includeAssetDetails: false,
      includeSystemFileAndFolder: true,
      limit: -1
    }
  )
}
