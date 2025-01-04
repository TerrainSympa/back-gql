import { createLogger, format, transports } from 'winston';
import path from 'path';
import DailyRotateFile from "winston-daily-rotate-file";

const logDirectory = process.env.LOG_DIRECTORY || '/app/logs';

const logger = createLogger({
    transports: [
        new DailyRotateFile({
            filename: path.join(logDirectory, 'gql-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true, // optional: compress the logs
            maxSize: '50m', // optional: set a max file size
            maxFiles: '30d' // optional: keep logs for the last 30 days
        }),
        new transports.Console()
    ],
    level: 'info',
    format: format.combine(
        format.timestamp(),
        format.json()
    ),
});

export default logger;
