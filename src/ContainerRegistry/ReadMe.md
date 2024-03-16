# Container Registry

## Delete old images

- https://docs.microsoft.com/en-us/azure/container-registry/container-registry-auto-purge
- https://github.com/Azure/acr/issues/323

```cmd
FILTER="--filter 'core/deepsea:.*' \
  --filter 'repository/images:.*' \
  --filter 'repository2/images.2:.*' \
  --ago 90d --keep 15"

PURGE_CMD="acr purge $FILTER"

PURGE_UNTAG_CMD="acr purge $FILTER --untagged"

az acr task create --name purgeTask \
  --cmd "$PURGE_CMD" \
  --schedule "0 1 * * Sun" \
  --registry TransRegistry \
  --timeout 3600 \
  --context /dev/null

az acr task create --name purgeUnTagTask \
  --cmd "$PURGE_UNTAG_CMD" \
  --schedule "0 1 * * Sun" \
  --registry TransRegistry \
  --timeout 3600 \
  --context /dev/null

az acr task run -n purgeTask -r TransRegistry
az acr task run -n purgeUnTagTask -r TransRegistry

az acr task delete -n purgeTask -r TransRegistry
az acr task delete -n purgeUnTagTask -r TransRegistry
```
