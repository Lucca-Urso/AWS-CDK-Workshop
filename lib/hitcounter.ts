import { AttributeType, Table } from "aws-cdk-lib/aws-dynamodb";
import { Code, Function, IFunction, Runtime } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

export interface HitCounterProps {
    /** the function which count url hits **/
    downstream: IFunction;
}

export class HitCounter extends Construct {
    // Exposes resources
    public readonly handler: Function;
    public readonly table: Table;
    
    constructor(scope: Construct, id: string, props: HitCounterProps) {
        super(scope, id);

        const table = new Table(this, "Hits", {
            partitionKey: { name: "path", type: AttributeType.STRING},
        });

        this.table = table;

        this.handler = new Function(this, "HitCounterHandler", {
            runtime: Runtime.NODEJS_22_X,
            handler: "hitcounter.handler",
            code: Code.fromAsset("lambda"),
            environment: {
                DOWNSTREAM_FUNCTION_NAME: props.downstream.functionName,
                HITS_TABLE_NAME: table.tableName,
            }
        });

        // Lambda role to read/write on DynamoDB table
        table.grantReadWriteData(this.handler);

        // Lambda permission to the downstream function
        props.downstream.grantInvoke(this.handler);
    }
}