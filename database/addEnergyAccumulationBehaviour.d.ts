import sqlite from 'better-sqlite3';
import type { EnergyAccumulationBehaviour } from '../types/recordTypes.js';
export declare function addEnergyAccumulationBehaviour(accumulationBehaviour: EnergyAccumulationBehaviour, sessionUser: EmileUser, connectedEmileDB?: sqlite.Database): number;
