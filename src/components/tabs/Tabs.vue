<template>
    <div class="tabs">
        <div class="tabs-container">
            <div class="tabs-navs">
                <div v-for="item in props.navs" :name="item.id"
                    :class="{ 'nav-item nav-item-active': item.active, 'nav-item': !item.active }" @click="selectedTabs(item)">
                    {{ item.label }}
                </div>
            </div>
            <div class="tabs-content">
                <slot></slot>
            </div>
        </div>


    </div>
</template>

<script setup lang="ts">

const props = defineProps<{ navs: TabsNavType[] }>();

const selectedTabs = (tab:TabsNavType)=>{
    props.navs.forEach(item =>{
        if(item.id === tab.id){
            item.active=true;
        }else{
            item.active=false;
        }
        
    })
}
// props.navs.forEach

</script>

<style scoped lang="scss">
.tabs-container {
    display: grid;
    grid-template-columns: 1fr;
    row-gap: 10px;

    .tabs-navs {
        border-bottom: 1.8px #acacac solid;
        height: 30px;

        .nav-item {
            display: inline-block;
            line-height: 30px;
            padding-right: 20px;
            font-size: 16px;
            font-weight: 500;
        }
        .nav-item:hover{
            cursor: pointer; 
            color: #04befe;
        }
        .nav-item-active {
            border-bottom: 2px solid;
            border-image: linear-gradient(-45deg, #4481eb 0, #04befe 100%) 1;
            color: #04befe;
        }        
    }
    .tabs-content {
            font-size: 14px;
    }
}
</style>