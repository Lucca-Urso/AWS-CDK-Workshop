import { Stack, StackProps, RemovalPolicy } from "aws-cdk-lib";
import { Bucket, BlockPublicAccess } from "aws-cdk-lib/aws-s3";
import { CodeBuildStep, CodePipeline, CodePipelineSource } from "aws-cdk-lib/pipelines";
import { PipelineType, Variable } from "aws-cdk-lib/aws-codepipeline";
import { Construct } from "constructs";

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

        // Pipeline variables
        const environmentVariables = new Variable({
            variableName: 'ENVIRONMENT',
            description: 'Deployment environment',
            defaultValue: 'dev',
        });

        const versionVariable = new Variable({
            variableName: 'VERSION',
            description: 'Application version',
            defaultValue: '1.0.0',
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
                    ENVIRONMENT: environmentVariables.reference(),
                    VERSION: versionVariable.reference(),
                },
            }),
        });
    }
}