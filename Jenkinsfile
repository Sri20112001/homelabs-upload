// Jenkins declarative pipeline for homelabs-upload (NodeVault).
// Mirrors .github/workflows/backend.yml: vet+test the Go backend,
// build the Vite frontend, build the Docker image, then deploy over SSH.
//
// Required Jenkins setup:
//   - Docker available on the agents that run the "Image" and "Deploy" stages.
//   - An "SSH Username with private key" credential with ID "homelabs-ssh-key"
//     (private half of the key authorized on the server via server/provision.sh).
//   - Adjust SERVER_USER / SERVER_PATH defaults below or override per build.

pipeline {
    agent none

    parameters {
        string(name: 'SERVER_HOST', defaultValue: '', description: 'Server IP/hostname (SSH, port 22)')
        string(name: 'SERVER_USER', defaultValue: 'administrator', description: 'Deploy user on the server')
        string(name: 'SERVER_PATH', defaultValue: '/home/administrator/homelabs-upload', description: 'App checkout path on the server')
    }

    stages {
        stage('Checkout') {
            agent any
            steps {
                checkout scm
            }
        }

        stage('Backend vet + test') {
            agent { docker { image 'golang:1.26-alpine' } }
            steps {
                dir('server') {
                    sh 'go vet ./...'
                    sh 'go test ./...'
                }
            }
        }

        stage('Frontend build') {
            agent { docker { image 'node:22-alpine' } }
            steps {
                dir('client') {
                    sh 'npm ci'
                    sh 'npm run build'
                }
            }
        }

        stage('Docker image build') {
            agent any
            steps {
                sh 'docker build -f server/Dockerfile -t nodevault-test:${BUILD_NUMBER} .'
            }
        }

        stage('Deploy over SSH') {
            agent any
            when {
                branch 'main'
            }
            steps {
                sshagent(['homelabs-ssh-key']) {
                    sh """
                        set -e
                        ssh -o StrictHostKeyChecking=no ${params.SERVER_USER}@${params.SERVER_HOST} "set -e; cd ${params.SERVER_PATH}; git fetch origin; git checkout ${env.GIT_COMMIT}; cd server; docker compose build; docker compose down --remove-orphans >/dev/null 2>&1 || true; docker compose up -d; docker image prune -f; sleep 8; curl -f http://localhost:8081/health; curl -s http://localhost:8081/ | grep -q NodeVault; curl -s http://localhost:8081/nodevault/ | grep -q NodeVault"
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
