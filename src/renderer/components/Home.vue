<script>
import PluginsList from '@/components/PluginsList.vue'
import TopBar from '@/components/TopBar.vue'

export default {
  name: 'Home',
  components: {
    TopBar,
    PluginsList
  }
}
</script>

<template>
  <div>
    <top-bar />
    <plugins-list />
  </div>
</template>
