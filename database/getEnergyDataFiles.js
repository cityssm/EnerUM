import { getConnectionWhenAvailable, getTempTableName } from '../helpers/functions.database.js';
function buildWhereClause(filters) {
    let sqlWhereClause = '';
    const sqlParameters = [];
    if ((filters.isPending ?? '') !== '') {
        sqlWhereClause += ' and f.isPending = ?';
        sqlParameters.push(filters.isPending ? 1 : 0);
    }
    if ((filters.isProcessed ?? '') !== '') {
        sqlWhereClause += filters.isProcessed
            ? ' and f.processedTimeMillis is not null'
            : ' and f.processedTimeMillis is null';
    }
    if ((filters.isFailed ?? '') !== '') {
        sqlWhereClause += ' and f.isFailed = ?';
        sqlParameters.push(filters.isFailed ? 1 : 0);
    }
    if ((filters.searchString ?? '') !== '') {
        sqlWhereClause += ' and (instr(f.originalFileName, ?) > 0)';
        sqlParameters.push(filters.searchString);
    }
    if ((filters.systemFolderPath ?? '') !== '') {
        sqlWhereClause += ' and f.systemFolderPath = ?';
        sqlParameters.push(filters.systemFolderPath);
    }
    return {
        sqlWhereClause,
        sqlParameters
    };
}
export async function getEnergyDataFiles(filters, options) {
    const groupByColumnNames = `f.fileId, f.originalFileName,
    ${options.includeSystemFileAndFolder
        ? ' f.systemFileName, f.systemFolderPath,'
        : ''}
    f.assetId,
    ${options.includeAssetDetails
        ? ' a.assetName, c.category, c.fontAwesomeIconClasses,'
        : ''}
    isPending, parserPropertiesJson,
    processedTimeMillis, isFailed, processedMessage,
    f.recordCreate_timeMillis, f.recordUpdate_timeMillis`;
    const { sqlParameters, sqlWhereClause } = buildWhereClause(filters);
    const sql = `select ${groupByColumnNames},
    ${filters.isProcessed ?? true
        ? `count(d.dataId) as energyDataCount,
            count(distinct d.assetId) as assetIdCount,
            min(d.timeSeconds) as timeSecondsMin,
            max(d.endTimeSeconds) as endTimeSecondsMax`
        : ' 0 as energyDataCount, 0 as assetIdCount, null as timeSecondsMin, null and endTimeSecondsMax'}
    from EnergyDataFiles f
    left join Assets a on f.assetId = a.assetId
    left join AssetCategories c on a.categoryId = c.categoryId
    ${filters.isProcessed ?? true
        ? ' left join EnergyData d on f.fileId = d.fileId and d.recordDelete_timeMillis is null'
        : ''}
    where ${options.includeDeletedRecords ?? false
        ? ' 1 = 1'
        : 'f.recordDelete_timeMillis is null'}
    ${sqlWhereClause}
    group by ${groupByColumnNames}`;
    let orderBy = ' order by recordUpdate_timeMillis desc';
    if (options.limit !== -1) {
        orderBy += ` limit ${options.limit}`;
    }
    const emileDB = await getConnectionWhenAvailable(true);
    const tempTableName = getTempTableName();
    emileDB
        .prepare(`create temp table ${tempTableName} as ${sql}`)
        .run(sqlParameters);
    const dataFiles = emileDB
        .prepare(`select * from ${tempTableName} ${orderBy}`)
        .all();
    emileDB.close();
    for (const dataFile of dataFiles) {
        if (dataFile.parserPropertiesJson !== undefined &&
            dataFile.parserPropertiesJson !== null) {
            dataFile.parserProperties = JSON.parse(dataFile.parserPropertiesJson);
        }
        delete dataFile.parserPropertiesJson;
    }
    return dataFiles;
}
export async function getPendingEnergyDataFiles() {
    return await getEnergyDataFiles({
        isPending: true
    }, {
        includeAssetDetails: true,
        includeSystemFileAndFolder: false,
        limit: -1
    });
}
export async function getFailedEnergyDataFiles() {
    return await getEnergyDataFiles({
        isFailed: true
    }, {
        includeAssetDetails: true,
        includeSystemFileAndFolder: false,
        limit: -1
    });
}
export async function getProcessedEnergyDataFiles(searchString) {
    return await getEnergyDataFiles({
        isProcessed: true,
        searchString
    }, {
        includeAssetDetails: true,
        includeSystemFileAndFolder: false,
        limit: 100
    });
}
export async function getEnergyDataFilesToProcess() {
    return await getEnergyDataFiles({
        isPending: false,
        isProcessed: false
    }, {
        includeAssetDetails: false,
        includeSystemFileAndFolder: true,
        limit: -1
    });
}
