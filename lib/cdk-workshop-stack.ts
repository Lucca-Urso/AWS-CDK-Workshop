import { LambdaRestApi } from 'aws-cdk-lib/aws-apigateway';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Stack, StackProps } from 'aws-cdk-lib/core';
import { TableViewer } from "cdk-dynamo-table-viewer";
import { Construct } from 'constructs';
import { HitCounter } from './hitcounter';

export class CdkWorkshopStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // AWS Lambda Configuration
    const hello = new Function(this, "HelloHandler", {
      runtime: Runtime.NODEJS_22_X, // Execution environment
      code: Code.fromAsset("lambda"), // Code loaded from "lambda" directory
      handler: "hello.handler", // File is "hello.js", function name is "handler"
    });

    const helloWithCounter = new HitCounter(this, "HelloHitCounter", {
      downstream: hello, // Configured as downstream
    });

    // AWS API Gateway Configuration
    const gateway = new LambdaRestApi(this, "Endpoint", {
      handler: helloWithCounter.handler,
    });

    const tv = new TableViewer(this, 'ViewHitCounter', {
      title: 'Hello Hits',
      table: helloWithCounter.table,
    });
  }
}
