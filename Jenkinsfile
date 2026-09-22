// Jenkins declarative pipeline for homelabs-upload (NodeVault).
// The Jenkins agent only needs git + ssh (no Docker, no Go, no Node).
// All heavy work (vet/test, frontend build, image build, deploy) runs
// on the app server over SSH, where Docker is installed.
//
// Required Jenkins setup:
//   - SSH Agent plugin + an "SSH Username with private key" credential
//     with ID "homelabs-ssh-key" (private half authorized on the server
//     via server/provision.sh).
//   - The server must have a git checkout of this repo at SERVER_PATH.

pipeline {
    agent none

    parameters {
        string(name: 'SERVER_HOST', defaultValue: '', description: 'Server IP/hostname (SSH, port 22)')
        string(name: 'SERVER_USER', defaultValue: 'administrator', description: 'Deploy user on the server')
        string(name: 'SERVER_PATH', defaultValue: '/home/administrator/homelabs-upload', description: 'App checkout path on the server')
        booleanParam(name: 'DEPLOY', defaultValue: true, description: 'Run the deploy stage after build/test')
    }

    stages {
        stage('Checkout') {
            agent any
            steps {
                checkout scm
                echo "Built commit: ${env.GIT_COMMIT}"
            }
        }

        stage('Sync server checkout') {
            agent any
            steps {
                sshagent(['homelabs-ssh-key']) {
                    sh """
                        ssh -o StrictHostKeyChecking=no ${params.SERVER_USER}@${params.SERVER_HOST} "cd ${params.SERVER_PATH} && git fetch origin && git checkout ${env.GIT_COMMIT}"
                    """
                }
            }
        }

        stage('Backend vet + test') {
            agent any
            steps {
                sshagent(['homelabs-ssh-key']) {
                    sh """
                        ssh -o StrictHostKeyChecking=no ${params.SERVER_USER}@${params.SERVER_HOST} "cd ${params.SERVER_PATH}/server && docker run --rm -v \$PWD:/work -w /work golang:1.26-alpine sh -c 'go vet ./... && go test ./...'"
                    """
                }
            }
        }

        stage('Frontend build') {
            agent any
            steps {
                sshagent(['homelabs-ssh-key']) {
                    sh """
                        ssh -o StrictHostKeyChecking=no ${params.SERVER_USER}@${params.SERVER_HOST} "cd ${params.SERVER_PATH}/client && docker run --rm -v \$PWD:/work -w /work node:22-alpine sh -c 'npm ci && npm run build'"
                    """
                }
            }
        }

        stage('Deploy') {
            agent any
            when {
                expression { return params.DEPLOY }
            }
            steps {
                sshagent(['homelabs-ssh-key']) {
                    sh """
                        set -e
                        ssh -o StrictHostKeyChecking=no ${params.SERVER_USER}@${params.SERVER_HOST} "set -e; cd ${params.SERVER_PATH}/server; docker compose build; docker compose down --remove-orphans >/dev/null 2>&1 || true; docker compose up -d; docker image prune -f; sleep 8; curl -f http://localhost:8081/health; curl -s http://localhost:8081/ | grep -q NodeVault; curl -s http://localhost:8081/nodevault/ | grep -q NodeVault"
                    """
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
