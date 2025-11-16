import { $ } from "bun";
import { getLog } from "./utils";
import type { SQSQueue, SNSTopic } from "../aws-cli.types";

/**
 * Retrieves all SQS queues in a region.
 *
 * @param {string} region - AWS region code
 * @returns {Promise<SQSQueue[]>} Array of SQS queue objects
 */
export async function describeSQSQueues(region: string): Promise<SQSQueue[]> {
  const { log, verbose } = getLog();

  const result =
    await $`aws sqs list-queues --region ${region} --output json`.text();

  if (!result || result.trim() === "") {
    return [];
  }

  const data = JSON.parse(result);

  const queues: SQSQueue[] = [];

  for (const queueUrl of data.QueueUrls || []) {
    const queueName = queueUrl.split("/").pop() || queueUrl;
    queues.push({
      queueUrl,
      queueName,
    });
  }

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

  const result =
    await $`aws sns list-topics --region ${region} --output json`.text();

  // Handle empty response - when no topics exist, AWS CLI may return empty string
  if (!result || result.trim() === "") {
    return [];
  }

  const data = JSON.parse(result);

  const topics: SNSTopic[] = [];

  for (const topic of data.Topics || []) {
    const topicArn = topic.TopicArn;
    const topicName = topicArn.split(":").pop() || topicArn;
    topics.push({
      topicArn,
      topicName,
    });
  }

  return topics;
}
