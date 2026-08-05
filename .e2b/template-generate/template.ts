import { Template } from "e2b";

const DockerFile = `
FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl psmisc \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /home/user/project
RUN mkdir -p /home/user/project

ENV PORT=3000
EXPOSE 3000`;

export const template = Template({
  fileContextPath: decodeURIComponent(new URL("..", import.meta.url).pathname),
}).fromDockerfile(DockerFile);
