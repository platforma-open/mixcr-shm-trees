<script setup lang="ts">
import { ICellRendererParams } from '@ag-grid-community/core';
import { ProgressPattern } from '@platforma-open/milaboratories.mixcr-shm-trees.model';
import { computed, unref } from 'vue';
import { TreeResult } from './results';

const props = defineProps<{
    params: ICellRendererParams<TreeResult, string>;
}>();

const progressString = computed(() => {
    return props.params.value ?? 'Unknown';
});

type Parsed = { 
    raw?: string; 
    stage?: string; 
    percentage?: string;  
    eta?: string;
    etaLabel?: string;
    percentageLabel?: string; 
};

const parsed = computed<Parsed>(() => {
    const raw = unref(progressString);

    const res: Parsed = {
        raw,
    };

    if (!raw) {
        return res;
    }

    const match = raw.match(ProgressPattern);

    if (match) {
        const { stage, progress, eta } = match?.groups!;
        res.stage = stage;
        res.percentage = progress;
        res.eta = eta;
    } else {
        res.stage = raw;
    }

    if (res.stage === 'Done') {
        res.percentage = '100';
    }

    if (res.percentage) {
        res.percentageLabel = res.percentage + '%';
    }

    if (res.eta) {
        res.etaLabel = `ETA: ${res.eta}`;
    }

    return res;
});
</script>

<template>
    <div class="progress-cell">
        <div class="progress-cell__indicator" :style="{ width: parsed.percentage + '%' }"></div>
        <div class="progress-cell__body">
            <div class="progress-cell__stage">{{ parsed.stage }}</div>
            <div class="progress-cell__percentage">{{ parsed.etaLabel ?? parsed.percentageLabel }}</div>
        </div>
    </div>
</template>

<style lang="css">
.progress-cell {
    background-color: transparent;
    height: 100%;
    background-color: var(--bg-elevated-01);
    position: relative;
    width: 100%;
    overflow: hidden;
    border-radius: 2px;
    /* border-left: 1px solid var(--border-color-div-grey);
    border-right: 1px solid var(--border-color-div-grey); */
}

.progress-cell__indicator {
    position: absolute;
    height: 100%;
    transition: width 0.4s ease-in-out;
    /* background: linear-gradient(90deg, #FFF 0%, #D8FAC8 100%); */
    background: linear-gradient(90deg, #FFF 0%, #D8FAC8 100%);
}

.progress-cell__body {
    padding: 0 15px;
    display: flex;
    gap: 12px;
    align-items: center;
    height: 100%;
    width: 100%;
    position: absolute;
    z-index: 1;
}

.progress-cell__stage {
    flex: 1;
}
</style>
