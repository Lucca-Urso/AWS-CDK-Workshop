import { Stack } from "aws-cdk-lib"
import { HitCounter } from "../lib/hitcounter";
import { Runtime, Code, Function} from "aws-cdk-lib/aws-lambda";
import { Capture, Template } from "aws-cdk-lib/assertions";
import { Environment } from "aws-cdk-lib/aws-appconfig";

test("DynamoDB Table Created", () => {
    const stack = new Stack();

    // When
    new HitCounter(stack, "TestConstruct", {
        downstream: new Function(stack, "TestFunction", {
            runtime: Runtime.NODEJS_22_X,
            handler: "hello.handler",
            code: Code.fromAsset("lambda"),
        }),
    });

    // Then
    const template = Template.fromStack(stack);
    template.resourceCountIs("AWS::DynamoDB::Table", 1);
});

test("DynamoDB Table Created With Encryption", () => {
    const stack = new Stack();

    // When
    new HitCounter(stack, "TestConstruct", {
        downstream: new Function(stack, "TestFunction", {
            runtime: Runtime.NODEJS_22_X,
            handler: "hello.handler",
            code: Code.fromAsset("lambda"),
        }),
    });

    // Then
    const template = Template.fromStack(stack);
    template.hasResourceProperties("AWS::DynamoDB::Table", {
        SSESpecification: {
            SSEEnabled: true,
        }
    })
});

test("read capacity can be configured", () => {
    const stack = new Stack();

    expect(() => {
        new HitCounter(stack, "TestConstruct", {
            downstream: new Function(stack, "TestFunction", {
                runtime: Runtime.NODEJS_22_X,
                handler: "hello.handler",
                code: Code.fromAsset("lambda"),
            }),
            readCapacity: 3,
        });
    }).toThrow(/readCapacity must be greater than 5 and less than 20/);
});

test("Lambda Has Environment Variables", () => {
    const stack = new Stack();

    // When
    new HitCounter(stack, "Test Construct", {
        downstream: new Function(stack, "TestFunction", {
            runtime: Runtime.NODEJS_22_X,
            handler: "hello.handler",
            code: Code.fromAsset("lambda"),
        }),
    });

    // Then
    const template = Template.fromStack(stack);
    const envCapture = new Capture();
    template.hasResourceProperties("AWS::Lambda::Function", {
        Environment: envCapture,
    });

    expect(envCapture.asObject()).toMatchObject({
        Variables: {
            DOWNSTREAM_FUNCTION_NAME: expect.objectContaining({ Ref: expect.any(String) }),
            HITS_TABLE_NAME: expect.objectContaining({ Ref: expect.any(String) }),
        },
    });
});

/* ToDo:
*
* Add more unit tests to grant coverage 
* Implement integration tests
* Implement property-based test
*/ 