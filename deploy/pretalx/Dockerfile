ARG PRETALX_IMAGE_TAG=latest
FROM pretalx/standalone:${PRETALX_IMAGE_TAG}

USER root
COPY plugins/pretalx_asyncapi_cfp /opt/pretalx-plugins/pretalx_asyncapi_cfp
RUN python -m pip install /opt/pretalx-plugins/pretalx_asyncapi_cfp
