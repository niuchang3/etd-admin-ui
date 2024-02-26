
<template>
    <div class="container">
        <div class="panels-container">
            <div class="panel panel-left">
                <div class="panel-left-content">
                    <h3>Welcome to visit Easy to Develop</h3>
                    <p>Easy to Develop framework Functional Demo</p>
                </div>
            </div>
            <div class="panel panel-right">

                <!-- <form> -->
                <div class="panel-right-form">
                    <div class="panel-right-tabs">
                        <span>Account</span>
                        <span>SMS</span>
                    </div>
                    <input type="text" name="username" placeholder="Please enter your username.">
                    <input type="password" name="username" placeholder="Please enter your password.">
                    <button>Login</button>
                </div>
                <!-- </form> -->
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
</script>

<style scoped lang="scss">
.container {
    position: relative;
    width: 100%;
    min-height: 100vh;
    background-color: #fff;
    overflow: hidden;
}

.container:before {
    content: '';
    position: absolute;
    width: 2000px;
    height: 2000px;
    top: -10%;
    right: 48%;
    border-radius: 50%;
    transform: translateY(-50%);
    background-image: linear-gradient(-45deg, #4481eb 0, #04befe 100%);
    ;
}

.panels-container {
    position: absolute;
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: repeat(2, 1fr)
}

.panel {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    text-align: center;
}

.panel-left {
    padding: 20% 20% 20% 20%;
    color: #fff;
    line-height: 3rem;
}

.panel-left h3 {
    font-size: 2rem
}

.panel-left p {
    font-size: 0.95rem;
    font-weight: 600;
}

.panel-right {
    justify-items: center;
    align-items: center;
    // padding-top: 240px;
    align-self: center;

}

.panel-right h3 {
    font-size: 2rem;
}

.panel-right-form {
    text-align: left;
    display: grid;
    grid-template-columns: 1fr;
    row-gap: 10px;
}

.panel-right-tabs {
    border-bottom: 1.5px #acacac solid;
    padding-bottom: 10px;
    width: 300px;
}

.panel-right-tabs span {
    padding: 9px;
}
.panel-right-tabs span:hover {
    border-bottom: 2px solid;
    border-image:linear-gradient(-45deg, #4481eb 0, #04befe 100%) 1;
}


.panel-right-form input {
    width: 300px;
    height: 40px;
    border: none;
    outline: none;
    background-color: white;
    border-bottom: 2px #acacac solid;
    font-size: 14px;
}

.panel-right-form input:hover{
    border-bottom: 2px solid;
    border-image:linear-gradient(-45deg, #4481eb 0, #04befe 100%) 1;
}


.panel-right-form input:-webkit-autofill {
    background: transparent;
    transition: background-color 50000s ease-in-out 0s;
    -webkit-text-fill-color: unset;
}

.panel-right-form button {
    padding: 0px;
    width: 304px;
    height: 40px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    background-image: linear-gradient(-45deg, #4481eb 0, #04befe 100%);
    color: white;
    font-weight: bolder;
    font-size: 14px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.panel-right-form button:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}</style>
