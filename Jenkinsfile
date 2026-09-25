pipeline {
    agent none

    options {
        skipDefaultCheckout(true)
    }

     environment {
        SERVER_PATH = '/home/administrator/homelabs-upload'
    }

    parameters {
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

                    cd server

                    go vet ./...
                    go test ./...
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

                        export RSYNC_RSH="ssh -i '$SSH_KEY' -o StrictHostKeyChecking=no"

                        rsync -az --delete \
                            --exclude='.git/' \
                            --exclude='server/data/' \
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
                            curl -f http://localhost:9630/health

                            echo 'Checking NodeVault root...'
                            curl -s http://localhost:9630/ | grep -q NodeVault

                            echo 'Checking NodeVault application...'
                            curl -s http://localhost:9630/nodevault/ | grep -q NodeVault

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

