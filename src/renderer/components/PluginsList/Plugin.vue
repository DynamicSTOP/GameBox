<script>
export default {
  name: 'Plugin',
  props: {
    plugin: {
      type: Object,
      required: true
    }
  },
  methods: {
    openSettings () {
      console.log('open settings')
    },
    removePlugin () {
      if (confirm(`Remove ${this.plugin.shortname} plugin from list? `)) {
        this.$store.dispatch('PLUGIN_REMOVE', this.plugin)
      }
    },
    deletePlugin () {
      if (confirm(`Delete ${this.plugin.shortname}?`)) {
        this.$store.dispatch('PLUGIN_DELETE', this.plugin)
      }
    },
    reloadPlugin () {
      if (confirm(`Reload ${this.plugin.shortname} plugin settings?`)) {
        this.$store.dispatch('PLUGIN_RELOAD_CONFIG', this.plugin)
      }
    }
  }
}
</script>

<template>
  <div class="plugin">
    <div class="shortname">
      {{ plugin.shortname }}
    </div>
    <div class="controls flex-row">
      <div
        class="item"
        title="Open settings"
      >
        S
      </div>
      <div class="flex-row">
        <div
          class="item"
          title="Reload config"
          @click="reloadPlugin"
        >
          R
        </div>
        <div
          class="item"
          title="Remove from list"
          @click="removePlugin"
        >
          D
        </div>
      </div>
    </div>
  </div>
</template>
