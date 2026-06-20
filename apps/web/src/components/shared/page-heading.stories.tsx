import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { PageHeading } from './page-heading';

const meta = {
  title: 'Shared/PageHeading',
  component: PageHeading,
  args: {
    title: 'CommerceFlow',
    description: 'Professional commerce platform',
  },
} satisfies Meta<typeof PageHeading>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutDescription: Story = {
  args: {
    description: undefined,
  },
};

export const LongTitle: Story = {
  args: {
    title: 'A very long page heading used to verify responsive behavior',
  },
};
