import { ListQueuesCommand } from "@aws-sdk/client-sqs";
import { ListTopicsCommand } from "@aws-sdk/client-sns";
import { getLog } from "./utils";
import { getSQSClient, getSNSClient } from "../sdk-clients";
import { executeWithRetry } from "../sdk-error-handler";
import type { SQSQueue, SNSTopic } from "../aws-cli.types";

/**
 * Retrieves all SQS queues in a region.
 *
 * @param {string} region - AWS region code
 * @returns {Promise<SQSQueue[]>} Array of SQS queue objects
 */
export async function describeSQSQueues(region: string): Promise<SQSQueue[]> {
  const { log, verbose } = getLog();
  const client = getSQSClient(region);

  const queues: SQSQueue[] = [];

  // Use pagination to get all queues
  let nextToken: string | undefined = undefined;

  do {
    const data = await executeWithRetry(
      async () => {
        const command = new ListQueuesCommand({
          NextToken: nextToken,
        });
        return await client.send(command);
      },
      "SQS",
      3,
      1000,
    );

    for (const queueUrl of data.QueueUrls || []) {
      const queueName = queueUrl.split("/").pop() || queueUrl;
      queues.push({
        queueUrl,
        queueName,
      });
    }

    nextToken = data.NextToken;
  } while (nextToken);

  return queues;
}

/**
 * Retrieves all SNS topics in a region.
 *
 * @param {string} region - AWS region code
 * @returns {Promise<SNSTopic[]>} Array of SNS topic objects
 */
export async function describeSNSTopics(region: string): Promise<SNSTopic[]> {
  const { log, verbose } = getLog();
  const client = getSNSClient(region);

  const topics: SNSTopic[] = [];

  // Use pagination to get all topics
  let nextToken: string | undefined = undefined;

  do {
    const data = await executeWithRetry(
      async () => {
        const command = new ListTopicsCommand({
          NextToken: nextToken,
        });
        return await client.send(command);
      },
      "SNS",
      3,
      1000,
    );

    for (const topic of data.Topics || []) {
      const topicArn = topic.TopicArn || "unknown";
      const topicName = topicArn.split(":").pop() || topicArn;
      topics.push({
        topicArn,
        topicName,
      });
    }

    nextToken = data.NextToken;
  } while (nextToken);

  return topics;
}
