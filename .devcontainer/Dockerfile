FROM node:20

# Install additional development tools
RUN apt-get update && apt-get install -y \
    git \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /workspace

# Switch to node user for development
USER node

# Set up shell
ENV SHELL=/bin/bash
