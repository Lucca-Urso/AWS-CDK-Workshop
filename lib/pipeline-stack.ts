import { Stack, StackProps, RemovalPolicy } from "aws-cdk-lib";
import { Bucket, BlockPublicAccess } from "aws-cdk-lib/aws-s3";
import { CodeBuildStep, CodePipeline, CodePipelineSource } from "aws-cdk-lib/pipelines";
import { PipelineType, Variable } from "aws-cdk-lib/aws-codepipeline";
import { Construct } from "constructs";
import { WorkshopPipelineStage } from "./pipeline-stage";

export class WorkshopPipelineStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        // Creates an S3 bucket for git remote
        const gitBucket = new Bucket(this, "GitBucket", {
            bucketName: `workshop-git-${this.account}-${this.region}`,
            versioned: true,
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
            removalPolicy: RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
        });

        // Create pipeline with S3 source
        const pipeline = new CodePipeline(this, "Pipeline", {
            pipelineName: "WorkshopPipeline",
            pipelineType: PipelineType.V2,
            synth: new CodeBuildStep("SynthStep", {
                input: CodePipelineSource.s3(gitBucket, "workshop-repo/refs/head/main/repo.zip"),
                commands: [
                    "npm ci",
                    "npm run build",
                    "npx cdk synth"
                ],
                env: {
                    ENVIRONMENT: 'dev',
                    VERSION: '1.0.0',
                },
            }),
        });

        const deploy = new WorkshopPipelineStage(this, "Deploy");
        const deployStage = pipeline.addStage(deploy);

        // Test action for pipeline variables
        deployStage.addPost(
            new CodeBuildStep("TestViewer", {
                projectName: "TestViewer",
                envFromCfnOutputs: {
                    ENDPOINT_URL: deploy.hcViewerUrl,
                },
                env: {
                    ENVIRONMENT: 'dev',
                    VERSION: '1.0.0',
                },
                commands: [
                    'echo "Testing TableViewer in environment: $ENVIRONMENT, version: $VERSION"',
                    'echo "Source: S3 git remote with automatic zip archive"',
                    "curl -Ssf $ENDPOINT_URL"
                ],
            }),

            new CodeBuildStep("TestAPI", {
                projectName: "TestAPI",
                envFromCfnOutputs: {
                    ENDPOINT_URL: deploy.hcEndpoint,
                },
                env: {
                    ENVIRONMENT: 'dev',
                    VERSION: '1.0.0',
                },
                commands: [
                    'echo "Testing API in environment: $ENVIRONMENT, version: $VERSION"',
                    'echo "Deployed from S3 bucket: ${gitBucket.bucketName}"',
                    "curl -Ssf $ENDPOINT_URL",
                    "curl -Ssf $ENDPOINT_URL/hello",
                    "curl -Ssf $ENDPOINT_URL/test" 
                ],
            })
        );
    }
}