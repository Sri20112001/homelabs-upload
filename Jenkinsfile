// Jenkins declarative pipeline for homelabs-upload (NodeVault).
//
// Jenkins checks out the repository using the GitHub credential
// "github-homelabs-upload" and then performs the heavy work on the
// application server over SSH.
//
// Required Jenkins credentials:
//   - github-homelabs-upload
//       Kind: Username with password
//       Username: Sri20112001
//       Password: GitHub Personal Access Token
//
//   - homelabs-ssh-key
//       Kind: SSH Username with private key
//       Used for SSH access to the application server.
//
// The application server must have a checkout of this repository at
// SERVER_PATH.

pipeline {
    agent none

    parameters {
        string(
            name: 'SERVER_HOST',
            defaultValue: '',
            description: 'Server IP/hostname (SSH, port 22)'
        )

        string(
            name: 'SERVER_USER',
            defaultValue: 'administrator',
            description: 'Deploy user on the server'
        )

        string(
            name: 'SERVER_PATH',
            defaultValue: '/home/administrator/homelabs-upload',
            description: 'App checkout path on the server'
        )

        booleanParam(
            name: 'DEPLOY',
            defaultValue: true,
            description: 'Run the deploy stage after build/test'
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

                echo "Built commit: ${env.GIT_COMMIT}"
            }
        }

        stage('Sync server checkout') {
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
                            "cd $SERVER_PATH && \
                             git fetch origin && \
                             git checkout $GIT_COMMIT"
                    '''
                }
            }
        }

        stage('Backend vet + test') {
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
                            "cd $SERVER_PATH/server && \
                             docker run --rm \
                             -v \\$PWD:/work \
                             -w /work \
                             golang:1.26-alpine \
                             sh -c 'go vet ./... && go test ./...'"
                    '''
                }
            }
        }

        stage('Frontend build') {
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
                            "cd $SERVER_PATH/client && \
                             docker run --rm \
                             -v \\$PWD:/work \
                             -w /work \
                             node:22-alpine \
                             sh -c 'npm ci && npm run build'"
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
                            "set -e; \
                             cd $SERVER_PATH/server; \
                             docker compose build; \
                             docker compose down --remove-orphans >/dev/null 2>&1 || true; \
                             docker compose up -d; \
                             docker image prune -f; \
                             sleep 8; \
                             curl -f http://localhost:8081/health; \
                             curl -s http://localhost:8081/ | grep -q NodeVault; \
                             curl -s http://localhost:8081/nodevault/ | grep -q NodeVault"
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
