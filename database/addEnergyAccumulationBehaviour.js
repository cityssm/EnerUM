import sqlite from 'better-sqlite3';
import { databasePath } from '../helpers/functions.database.js';
export function addEnergyAccumulationBehaviour(accumulationBehaviour, sessionUser, connectedEmileDB) {
    const emileDB = connectedEmileDB === undefined ? sqlite(databasePath) : connectedEmileDB;
    const rightNowMillis = Date.now();
    const result = emileDB
        .prepare(`insert into EnergyAccumulationBehaviours (
        accumulationBehaviour, greenButtonId,
        recordCreate_userName, recordCreate_timeMillis,
        recordUpdate_userName, recordUpdate_timeMillis)
        values (?, ?, ?, ?, ?, ?)`)
        .run(accumulationBehaviour.accumulationBehaviour, accumulationBehaviour.greenButtonId, sessionUser.userName, rightNowMillis, sessionUser.userName, rightNowMillis);
    if (connectedEmileDB === undefined) {
        emileDB.close();
    }
    return result.lastInsertRowid;
}
