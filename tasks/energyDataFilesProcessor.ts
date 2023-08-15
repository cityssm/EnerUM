import fs from 'node:fs/promises'
import path from 'node:path'

import Debug from 'debug'
import exitHook from 'exit-hook'
import { setIntervalAsync, clearIntervalAsync } from 'set-interval-async'

import { getEnergyDataFilesToProcess } from '../database/getEnergyDataFiles.js'
import { updateEnergyDataFileAsFailed } from '../database/updateEnergyDataFile.js'
import type { BaseParser } from '../parsers/baseParser.js'
import { CsvParser } from '../parsers/csvParser.js'
import { GreenButtonParser } from '../parsers/greenButtonParser.js'
import { getParserClasses } from '../parsers/parserHelpers.js'

const debug = Debug('emile:tasks:energyDataFilesProcessor')

const processorUser: EmileUser = {
  userName: 'system.fileProcessor',
  canLogin: false,
  canUpdate: true,
  isAdmin: true
}

/*
 * Task
 */

let terminateTask = false

async function processFiles(): Promise<void> {
  const dataFiles = getEnergyDataFilesToProcess()

  for (const dataFile of dataFiles) {
    if (terminateTask) {
      break
    }

    /*
     * Validate file exists and can be read
     */

    const filePath = path.join(
      dataFile.systemFolderPath,
      dataFile.systemFileName
    )

    try {
      await fs.access(filePath, fs.constants.R_OK)
    } catch (error) {
      debug(error)

      updateEnergyDataFileAsFailed(
        {
          fileId: dataFile.fileId as number,
          processedTimeMillis: Date.now(),
          processedMessage: 'File access error.'
        },
        processorUser
      )

      continue
    }

    /*
     * Validate parserClass is valid
     */

    if (
      !getParserClasses().includes(dataFile.parserProperties?.parserClass ?? '')
    ) {
      updateEnergyDataFileAsFailed(
        {
          fileId: dataFile.fileId as number,
          processedTimeMillis: Date.now(),
          processedMessage: `Selected parser not found: ${
            dataFile.parserProperties?.parserClass ?? ''
          }`
        },
        processorUser
      )

      continue
    }

    /*
     * Load the parser
     */

    let parser: BaseParser

    switch (dataFile.parserProperties?.parserClass ?? '') {
      case 'GreenButtonParser': {
        parser = new GreenButtonParser(dataFile)
        break
      }
      case 'CsvParser': {
        parser = new CsvParser(dataFile)
        break
      }
      default: {
        updateEnergyDataFileAsFailed(
          {
            fileId: dataFile.fileId as number,
            processedTimeMillis: Date.now(),
            processedMessage: `Selected parser not implemented: ${
              (dataFile.parserProperties?.parserClass as string) ?? ''
            }`
          },
          processorUser
        )

        continue
      }
    }

    /*
     * Parse the file
     */

    await parser.parseFile()
  }
}

/*
 * Run the task
 */

await processFiles().catch((error) => {
  debug('Error running task.')
  debug(error)
})

const intervalID = setIntervalAsync(processFiles, 3 * 60 * 1000)

exitHook(() => {
  terminateTask = true
  try {
    void clearIntervalAsync(intervalID)
  } catch {
    debug('Error exiting task.')
  }
})
