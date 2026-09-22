pipeline {
    agent none

    options {
        skipDefaultCheckout(true)
    }

    parameters {
        string(
            name: 'SERVER_HOST',
            defaultValue: 'YOUR_VPS_IP',
            description: 'VPS IP address or hostname'
        )

        string(
            name: 'SERVER_USER',
            defaultValue: 'administrator',
            description: 'SSH user on the VPS'
        )

        string(
            name: 'SERVER_PATH',
            defaultValue: '/home/administrator/homelabs-upload',
            description: 'Application deployment directory on the VPS'
        )

        booleanParam(
            name: 'DEPLOY',
            defaultValue: true,
            description: 'Deploy after tests and frontend build'
        )
    }

    stages {

        stage('Checkout') {
            agent any

            steps {
                git(
                    url: 'https://github.com/Sri20112001/homelabs-upload.git',
                    branch: 'main',
                    credentialsId: 'github-homelabs-upload'
                )

                sh 'echo "Built commit: $(git rev-parse HEAD)"'
            }
        }

        stage('Backend vet + test') {
            agent any

            steps {
                sh '''
                    set -e

                    docker run --rm \
                        -v "$PWD/server:/work" \
                        -w /work \
                        golang:1.26-alpine \
                        sh -c 'go vet ./... && go test ./...'
                '''
            }
        }

stage('Frontend build') {
    agent any
    steps {
        sh '''
            set -e
            cd client
            npm ci
            npm run build
        '''
    }
}

        stage('Sync application to server') {
            when {
                expression {
                    return params.DEPLOY
                }
            }

            agent any

            steps {
                withCredentials([
                    sshUserPrivateKey(
                        credentialsId: 'homelabs-ssh-key',
                        keyFileVariable: 'SSH_KEY'
                    )
                ]) {

                    sh '''
                        set -e

                        echo "Creating deployment directory..."

                        ssh \
                            -i "$SSH_KEY" \
                            -o StrictHostKeyChecking=no \
                            "$SERVER_USER@$SERVER_HOST" \
                            "mkdir -p '$SERVER_PATH'"

                        echo "Syncing application source..."

                        rsync -az --delete \
                            --exclude='.git/' \
                            --exclude='server/data/' \
                            -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
                            ./ \
                            "$SERVER_USER@$SERVER_HOST:$SERVER_PATH/"

                        echo "Application sync completed."
                    '''
                }
            }
        }

        stage('Deploy') {
            when {
                expression {
                    return params.DEPLOY
                }
            }

            agent any

            steps {
                withCredentials([
                    sshUserPrivateKey(
                        credentialsId: 'homelabs-ssh-key',
                        keyFileVariable: 'SSH_KEY'
                    )
                ]) {

                    sh '''
                        set -e

                        ssh \
                            -i "$SSH_KEY" \
                            -o StrictHostKeyChecking=no \
                            "$SERVER_USER@$SERVER_HOST" \
                            "
                            set -e

                            cd '$SERVER_PATH/server'

                            echo 'Building Docker images...'
                            docker compose build

                            echo 'Stopping existing containers...'
                            docker compose down --remove-orphans || true

                            echo 'Starting application...'
                            docker compose up -d

                            echo 'Removing unused Docker images...'
                            docker image prune -f

                            echo 'Waiting for application...'
                            sleep 8

                            echo 'Checking health endpoint...'
                            curl -f http://localhost:8081/health

                            echo 'Checking NodeVault root...'
                            curl -s http://localhost:8081/ | grep -q NodeVault

                            echo 'Checking NodeVault application...'
                            curl -s http://localhost:8081/nodevault/ | grep -q NodeVault

                            echo 'Deployment successful.'
                            "
                    '''
                }
            }
        }
    }

    post {
        success {
            echo 'Pipeline succeeded.'
        }

        failure {
            echo 'Pipeline failed — check the failing stage log above.'
        }
    }
}
