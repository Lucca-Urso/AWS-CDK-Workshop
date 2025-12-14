import { RemovalPolicy } from "aws-cdk-lib";
import { AttributeType, Table, TableEncryption } from "aws-cdk-lib/aws-dynamodb";
import { Code, Function, IFunction, Runtime } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

export interface HitCounterProps {
    /** the function which count url hits **/
    downstream: IFunction;
    readCapacity?: number;
}

export class HitCounter extends Construct {
    // Exposes resources
    public readonly handler: Function;
    public readonly table: Table;
    
    constructor(scope: Construct, id: string, props: HitCounterProps) {
        // Props validation
        if (props.readCapacity !== undefined && (
            props.readCapacity < 5 || props.readCapacity > 20)) {
                throw new Error("readCapacity must be greater than 5 and less than 20");
            }

        super(scope, id);

        const table = new Table(this, "Hits", {
            partitionKey: { name: "path", type: AttributeType.STRING},
            encryption: TableEncryption.AWS_MANAGED,
            readCapacity: props.readCapacity ?? 5,
            removalPolicy: RemovalPolicy.DESTROY,
        });

        this.table = table;

        this.handler = new Function(this, "HitCounterHandler", {
            runtime: Runtime.NODEJS_22_X,
            handler: "hitcounter.handler",
            code: Code.fromAsset("lambda"),
            environment: {
                DOWNSTREAM_FUNCTION_NAME: props.downstream.functionName, // Set the downstream
                HITS_TABLE_NAME: table.tableName,
            }
        });

        // Lambda role to read/write on DynamoDB table
        table.grantReadWriteData(this.handler);

        // Lambda permission to the downstream function
        props.downstream.grantInvoke(this.handler);
    }
}