import AWS from 'aws-sdk';

const CONNECT_INSTANCE_ID = process.env.CONNECT_INSTANCE_ID;
const CONNECT_CONTACT_FLOW_ID = process.env.CONNECT_CONTACT_FLOW_ID;
export const handler = async (event) => {
    // Amazon Connectのフローを呼び出す
    const connect = new AWS.Connect();
    const params = {
        InstanceId: CONNECT_INSTANCE_ID,
        ContactFlowId: CONNECT_CONTACT_FLOW_ID,
        DesteinationPhoneNumber: event.phoneNumber,
        SourcePoneNumber: process.env.SOURCE_PHONE_NUMBER,
    };
    try {
        const response = await connect.startOutboundVoiceContact(params).promise();
        console.log(JSON.stringify(response));
    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            body: err
        }
    }
    // Lambdaのレスポンス
    const response = {
        statusCode: 200,
    };
    return response;
};
