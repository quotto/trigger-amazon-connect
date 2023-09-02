import AWS  from "aws-sdk";

export const handler = async (event) => {
    if(event.eventType !== 'complete' && event.eventType !== 'schedule') {
        console.error(`eventType is invalid. eventType: ${event.eventType}`);
        return {
            statusCode: 400
        }
    }

    // キーとして現在日付を使用する
    // 現在日付は日本時間で算出する
    const dynamoDB = new AWS.DynamoDB.DocumentClient({ region: process.env.DB_REGION });
    const nowTokyo = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const nowISO8601 = nowTokyo.toISOString();
    const dataKey = nowISO8601.slice(0, 10);

    if(event.eventType === 'complete') {
        // DBのステータスをcompletedに更新する
        // 初回実行の場合はデータが存在しない状態で実行されるため、
        // その場合はデータを作成する
        const params = {
            TableName: process.env.TABLE_NAME,
            Key: {
                date: dataKey
            },
        };
        const response = await dynamoDB.get(params).promise();
        if (response.Item) {
            const updateParams = {
                TableName: process.env.TABLE_NAME,
                Key: {
                    date: dataKey
                },
                UpdateExpression: 'set #status = :status',
                ExpressionAttributeNames: {
                    '#status': 'status',
                },
                ExpressionAttributeValues: {
                    ':status': 'completed',
                },
            };
            await dynamoDB.update(updateParams).promise();
        } else {
            const putParams = {
                TableName: process.env.TABLE_NAME,
                Item: {
                    date: dataKey,
                    count: 1,
                    status: 'completed',
                },
            };
            await dynamoDB.put(putParams).promise();
        }
        return {
            statusCode: 200
        }
    } else if(event.eventType === 'schedule') {
        // DynamoDBからデータを取得し、その日の実行回数上限以下であれば
        // 10分後に起動するEventBridgeSchedulerのスケジュールを作成する

        const params = {
            TableName: process.env.TABLE_NAME,
            Key: {
                date: dataKey
            },
        };
        const response = await dynamoDB.get(params).promise();

        let count = response.Item && response.Item.count ? response.Item.count + 1 : 1;
        if (count <= process.env.MAX_COUNT && response.Item.status !== 'completed') {
            // 10分後に起動するEventBridgeSchedulerのスケジュールを作成する
            const eventBridgeScheduler = new AWS.Scheduler();
            const createSchedulerParams = {
                Name: `trigger-connect-${nowISO8601.slice(0, 10)}-${count}`,
                ActionAfterCompletion: 'DELETE',
                FlexibleTimeWindow: {
                    Mode: 'OFF'
                },
                ScheduleExpression: `at(${new Date(nowTokyo.getTime() + 10 * 60 * 1000).toISOString().slice(0, 19)})`,
                ScheduleExpressionTimezone: 'Asia/Tokyo',
                Target: {
                    Arn: process.env.LAMBDA_ARN,
                    RoleArn: process.env.SCHEDULER_ROLE_ARN,
                    Input: JSON.stringify({
                        phoneNumber: process.env.PHONE_NUMBER,
                    }),
                    RetryPolicy: {
                        MaximumEventAgeInSeconds: 60,
                        MaximumRetryAttempts: 5,
                    }
                }
            }
            try {
                await eventBridgeScheduler.createSchedule(createSchedulerParams).promise();
            } catch (err) {
                console.error(err);
                return {
                    statusCode: 500,
                }
            }

            // DynamoDBにデータを保存する
            const putParams = {
                TableName: process.env.TABLE_NAME,
                Item: {
                    date: dataKey,
                    count: count + 1,
                },
            };
            await dynamoDB.put(putParams).promise();
            return {
                statusCode: 200
            }
        }
    }
}