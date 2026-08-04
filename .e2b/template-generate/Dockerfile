FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl psmisc \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /home/user/project

COPY my-app/ /home/user/project/
RUN npm install

COPY template-generate/run.sh /usr/local/bin/run-nextjs
RUN chmod +x /usr/local/bin/run-nextjs

ENV PORT=5173
EXPOSE 5173

CMD ["/usr/local/bin/run-nextjs"]
