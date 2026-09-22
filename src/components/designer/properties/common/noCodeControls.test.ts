import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import VisibilityConditionBuilder from './VisibilityConditionBuilder.vue';
import FormatSelector from './FormatSelector.vue';
import FieldContentSelector from './FieldContentSelector.vue';

describe('No-Code Controls for Non-Technical Managers', () => {
  describe('VisibilityConditionBuilder', () => {
    it('should emit correct JRXML expression for first_page_only preset', async () => {
      const wrapper = mount(VisibilityConditionBuilder, {
        props: { modelValue: '' }
      });

      const select = wrapper.find('select.form-select');
      await select.setValue('first_page_only');
      await select.trigger('change');

      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['$V{PAGE_NUMBER} == 1']);
    });

    it('should emit correct JRXML expression for hide_first_page preset', async () => {
      const wrapper = mount(VisibilityConditionBuilder, {
        props: { modelValue: '' }
      });

      const select = wrapper.find('select.form-select');
      await select.setValue('hide_first_page');
      await select.trigger('change');

      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['$V{PAGE_NUMBER} > 1']);
    });

    it('should compile custom condition for equality', async () => {
      const wrapper = mount(VisibilityConditionBuilder, {
        props: {
          modelValue: '',
          reportFields: [{ name: 'status', class: 'java.lang.String' }]
        }
      });

      const presetSelect = wrapper.find('select.form-select');
      await presetSelect.setValue('custom');
      await presetSelect.trigger('change');

      const valueInput = wrapper.find('input.value-input');
      await valueInput.setValue('Active');
      await valueInput.trigger('input');

      const emitted = wrapper.emitted('update:modelValue');
      expect(emitted).toBeDefined();
      const lastEmitted = emitted![emitted!.length - 1][0];
      expect(lastEmitted).toContain('$F{status} != null && $F{status}.toString().equals("Active")');
    });

    it('should detect existing expression and set proper preset', async () => {
      const wrapper = mount(VisibilityConditionBuilder, {
        props: {
          modelValue: '$V{PAGE_NUMBER} > 1'
        }
      });

      const select = wrapper.find<HTMLSelectElement>('select.form-select');
      expect(select.element.value).toBe('hide_first_page');
    });
  });

  describe('FormatSelector', () => {
    it('should detect currency pattern and format properly', async () => {
      const wrapper = mount(FormatSelector, {
        props: { modelValue: '$#,##0.00;($#,##0.00)' }
      });

      const select = wrapper.find<HTMLSelectElement>('select.form-select');
      expect(select.element.value).toBe('currency');
    });

    it('should emit number pattern when selecting number category', async () => {
      const wrapper = mount(FormatSelector, {
        props: { modelValue: '' }
      });

      const select = wrapper.find('select.form-select');
      await select.setValue('number');
      await select.trigger('change');

      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['#,##0.00']);
    });

    it('should emit date pattern when selecting date category', async () => {
      const wrapper = mount(FormatSelector, {
        props: { modelValue: '' }
      });

      const select = wrapper.find('select.form-select');
      await select.setValue('date');
      await select.trigger('change');

      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['yyyy-MM-dd']);
    });
  });

  describe('FieldContentSelector', () => {
    it('should emit field expression when selecting data field', async () => {
      const wrapper = mount(FieldContentSelector, {
        props: {
          modelValue: '',
          reportFields: [{ name: 'customer_name', class: 'java.lang.String' }]
        }
      });

      const fieldSelect = wrapper.find('select.form-select');
      await fieldSelect.setValue('$F{customer_name}');
      await fieldSelect.trigger('change');

      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['$F{customer_name}']);
    });

    it('should emit document info preset when clicked', async () => {
      const wrapper = mount(FieldContentSelector, {
        props: { modelValue: '' }
      });

      const modeBtns = wrapper.findAll('button.mode-tab-btn');
      await modeBtns[1].trigger('click'); // Switch to doc info mode

      const presetCards = wrapper.findAll('button.preset-card');
      await presetCards[0].trigger('click'); // Page Number

      const emitted = wrapper.emitted('update:modelValue');
      expect(emitted).toBeDefined();
      expect(emitted![emitted!.length - 1][0]).toBe('$V{PAGE_NUMBER}');
    });

    it('should compile template text with field placeholder to concatenation expression', async () => {
      const wrapper = mount(FieldContentSelector, {
        props: {
          modelValue: '',
          reportFields: [{ name: 'order_id', class: 'java.lang.Integer' }]
        }
      });

      const modeBtns = wrapper.findAll('button.mode-tab-btn');
      await modeBtns[2].trigger('click'); // Switch to template mode

      const textarea = wrapper.find('textarea.form-textarea');
      await textarea.setValue('Invoice #{order_id}');
      await textarea.trigger('input');

      const emitted = wrapper.emitted('update:modelValue');
      expect(emitted).toBeDefined();
      expect(emitted![emitted!.length - 1][0]).toBe('"Invoice #" + $F{order_id}');
    });
  });
});
