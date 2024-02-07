
<template>
    <div class="container">
        <div class="panels-container">
            <div class="panel panel-left">
                <div class="panel-left-content">
                    <h3>Welcome to visit Easy to Develop</h3>
                    <p>Easy to Develop </p>
                </div>
            </div>
            <div class="panel panel-right">flex right</div>
        </div>
    </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.container{
    position: relative;
    width: 100%;
    min-height: 100vh;
    background-color: #fff;
    overflow: hidden;
}
.container:before{
    content: '';
    position: absolute;
    width: 2000px;
    height: 2000px;
    top: -10%;
    right: 48%;
    border-radius: 50%;
    transform: translateY(-50%);
    background-image: linear-gradient(-45deg,#4481eb 0,#04befe 100%);;
}
.panels-container{
    position: absolute;
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: repeat(2,1fr)
}
.panel{
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    text-align: center;
}
.panel-left{
    padding: 20% 20% 20% 20%;
    color: #fff;
    line-height: 1rem;
}
</style>
