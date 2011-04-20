from __future__ import with_statement
from fabric.api import *

env.user = 'pazzis'
env.port = 2001
env.hosts = ['beta.pazzis.com:2001']

BASE_DIR = '/home/pazzis/zizanie'

def prepare_deploy():
    """
    Create archive
    """
    # Create bundle ./node_modules
    local('npm bundle')
    local('tar -czf /tmp/zizanie.tgz . --exclude-vcs', capture=False)

def deploy():
    """
    Deploy to server
    """
    put('/tmp/zizanie.tgz', BASE_DIR)
    with cd(BASE_DIR):
        run('tar xzf zizanie.tgz')

def start_server():
    with cd(BASE_DIR):
        run('NODE_ENV=production nohup ./bin/zizanie start >& ~/zizanie.logs < /dev/null &')

def restart_server():
    with cd(BASE_DIR):
        run('kill -USR2 `cat tmp/zizanie.pid`')

def stop_server():
    with cd(BASE_DIR):
        run('kill `cat tmp/zizanie.pid`')
        run('rm tmp/zizanie.pid')
