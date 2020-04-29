<script>
import PluginsList from '@/components/PluginsList'
import TopBar from '@/components/TopBar'

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
