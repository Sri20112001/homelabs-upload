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

                sh '''
                    echo "Built commit: $(git rev-parse HEAD)"
                '''
            }
        }

        stage('Backend vet + test') {
            agent any

            steps {
                sh '''
                    set -e

                    cd server

                    echo "Running Go vet..."
                    go vet ./...

                    echo "Running Go tests..."
                    go test ./...

                    echo "Backend checks passed."
                '''
            }
        }

        stage('Frontend build') {
            agent any

            steps {
                sh '''
                    set -e

                    cd client

                    echo "Installing frontend dependencies..."
                    npm ci

                    echo "Building frontend..."
                    npm run build

                    echo "Frontend build completed."
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
                        keyFileVariable: 'SSH_KEY',
                        usernameVariable: 'SSH_USER'
                    )
                ]) {
                    sh '''
                        set -e

                        echo "Deployment target: $DEPLOY_HOST"
                        echo "Deployment path: $SERVER_PATH"

                        echo "Creating deployment directory..."

                        ssh \
                            -i "$SSH_KEY" \
                            -o StrictHostKeyChecking=no \
                            "$SSH_USER@$DEPLOY_HOST" \
                            "mkdir -p '$SERVER_PATH'"

                        echo "Syncing application source..."

                        export RSYNC_RSH="ssh -i '$SSH_KEY' -o StrictHostKeyChecking=no"

                        rsync -az --delete \
                            --exclude='.git/' \
                            --exclude='server/data/' \
                            ./ \
                            "$SSH_USER@$DEPLOY_HOST:$SERVER_PATH/"

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
                        keyFileVariable: 'SSH_KEY',
                        usernameVariable: 'SSH_USER'
                    )
                ]) {
                    sh '''
                        set -e

                        echo "Connecting to deployment server..."

                        ssh \
                            -i "$SSH_KEY" \
                            -o StrictHostKeyChecking=no \
                            "$SSH_USER@$DEPLOY_HOST" \
                            "
                            set -e

                            cd '$SERVER_PATH/server'

                            echo '========================================'
                            echo 'Building Docker images'
                            echo '========================================'

                            docker compose build

                            echo '========================================'
                            echo 'Stopping existing containers'
                            echo '========================================'

                            docker compose down --remove-orphans || true

                            echo '========================================'
                            echo 'Starting application'
                            echo '========================================'

                            docker compose up -d

                            echo '========================================'
                            echo 'Removing unused Docker images'
                            echo '========================================'

                            docker image prune -f

                            echo '========================================'
                            echo 'Waiting for application'
                            echo '========================================'

                            sleep 8

                            echo '========================================'
                            echo 'Checking health endpoint'
                            echo '========================================'

                            curl -f http://localhost:9630/health

                            echo '========================================'
                            echo 'Checking NodeVault root'
                            echo '========================================'

                            curl -s http://localhost:9630/ | grep -q NodeVault

                            echo '========================================'
                            echo 'Checking NodeVault application'
                            echo '========================================'

                            curl -s http://localhost:9630/nodevault/ | grep -q NodeVault

                            echo '========================================'
                            echo 'Deployment successful.'
                            echo '========================================'
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

        always {
            echo 'Pipeline execution completed.'
        }
    }
}
