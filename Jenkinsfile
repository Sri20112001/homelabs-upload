// Jenkins declarative pipeline for homelabs-upload (NodeVault).
// Mirrors .github/workflows/backend.yml: vet+test the Go backend,
// build the Vite frontend, build the Docker image, then deploy over SSH.
//
// Required Jenkins setup:
//   - Docker daemon available on the agent (no extra plugins needed).
//     Only plugins required: Pipeline + SSH Agent + Credentials.
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
            agent any
            steps {
                sh 'docker run --rm -v "$WORKSPACE/server:/work" -w /work golang:1.26-alpine sh -c "go vet ./... && go test ./..."'
            }
        }

        stage('Frontend build') {
            agent any
            steps {
                sh 'docker run --rm -v "$WORKSPACE/client:/work" -w /work node:22-alpine sh -c "npm ci && npm run build"'
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
