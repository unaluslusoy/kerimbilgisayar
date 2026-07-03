import React from 'react';

// Temel JSON Schema tanımı (basitleştirilmiş)
export interface JSONSchema {
  type: 'object';
  properties: Record<string, {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    title: string;
    description?: string;
    widget?: 'text' | 'textarea' | 'richtext' | 'image' | 'color' | 'select' | 'range' | 'toggle' | 'repeater' | 'linkPicker';
    options?: any[]; // for select
    items?: any; // for array/repeater
    default?: any;
  }>;
  required?: string[];
}

export interface ElementDefinition {
  key: string;
  label: string;
  category: 'layout' | 'ecommerce' | 'content' | 'navigation' | 'marketing';
  icon: string;
  schema: JSONSchema;
  defaultProps: Record<string, any>;
  Component: React.ComponentType<any>;
  allowedRegions?: string[]; // ör. sadece 'header' bölgesinde kullanılabilir
}

class ElementRegistry {
  private elements: Map<string, ElementDefinition> = new Map();

  register(element: ElementDefinition) {
    if (this.elements.has(element.key)) {
      console.warn(`Element with key ${element.key} is already registered.`);
      return;
    }
    this.elements.set(element.key, element);
  }

  get(key: string): ElementDefinition | undefined {
    return this.elements.get(key);
  }

  getAll(): ElementDefinition[] {
    return Array.from(this.elements.values());
  }

  getByCategory(category: ElementDefinition['category']): ElementDefinition[] {
    return this.getAll().filter(el => el.category === category);
  }
}

export const registry = new ElementRegistry();

// Export as default or named
export default registry;
