<script>
import { mapGetters } from 'vuex'
import Plugin from './PluginsList/Plugin'
import AddPlugin from './PluginsList/AddPlugin'

export default {
  name: 'PluginsList',
  components: { AddPlugin, Plugin },
  computed: {
    ...mapGetters(['plugins'])
  }
}
</script>

<template>
  <div class="PluginsList">
    <plugin
      v-for="plugin in plugins"
      :key="'plugin_'+plugin.name"
      class="item"
    />
    <add-plugin
      class="item"
    />
  </div>
</template>
